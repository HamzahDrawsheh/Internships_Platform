import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authUser: vi.fn(),
  createClient: vi.fn(),
  generateStudentEmbeddingsForAll: vi.fn(),
  generateInternshipEmbeddingsForAll: vi.fn(),
  profileRole: null as string | null,
}));

function profilesQuery() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: mocks.profileRole ? { role: mocks.profileRole } : null,
      error: null,
    })),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/ai/embeddings", () => ({
  generateStudentEmbeddingsForAll: mocks.generateStudentEmbeddingsForAll,
  generateInternshipEmbeddingsForAll: mocks.generateInternshipEmbeddingsForAll,
}));

import { POST } from "./route";

describe("POST /api/embeddings/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileRole = null;
    mocks.authUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.authUser },
      from: vi.fn(() => profilesQuery()),
    });
    mocks.generateStudentEmbeddingsForAll.mockResolvedValue({ total: 1, updated: 1 });
    mocks.generateInternshipEmbeddingsForAll.mockResolvedValue({ total: 1, updated: 1 });
  });

  it("rejects unauthenticated users", async () => {
    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.generateStudentEmbeddingsForAll).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    mocks.authUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.profileRole = "company";

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mocks.generateStudentEmbeddingsForAll).not.toHaveBeenCalled();
  });

  it("allows admins to generate embeddings", async () => {
    mocks.authUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mocks.profileRole = "admin";

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(mocks.generateStudentEmbeddingsForAll).toHaveBeenCalledOnce();
    expect(mocks.generateInternshipEmbeddingsForAll).toHaveBeenCalledOnce();
  });
});
