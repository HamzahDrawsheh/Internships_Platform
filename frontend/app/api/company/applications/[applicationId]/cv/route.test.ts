import { beforeEach, describe, expect, it, vi } from "vitest";

type TableResult = { data: unknown; error: unknown };

const mocks = vi.hoisted(() => ({
  tableResults: new Map<string, TableResult>(),
  authUser: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  createSignedUrl: vi.fn(),
}));

function queryFor(table: string) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => mocks.tableResults.get(table) ?? { data: null, error: null }),
    single: vi.fn(async () => mocks.tableResults.get(table) ?? { data: null, error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET } from "./route";

describe("GET /api/company/applications/[applicationId]/cv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tableResults.clear();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    mocks.authUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.authUser },
      from: (table: string) => queryFor(table),
    });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/cv.pdf" }, error: null });
    mocks.createAdminClient.mockReturnValue({
      storage: {
        from: vi.fn(() => ({ createSignedUrl: mocks.createSignedUrl })),
      },
    });
  });

  it("rejects unauthenticated requests", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ applicationId: "app-1" }) });

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects non-company users", async () => {
    mocks.authUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.tableResults.set("profiles", { data: { role: "student" }, error: null });

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ applicationId: "app-1" }) });

    expect(response.status).toBe(403);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns a signed CV URL for the owning company", async () => {
    mocks.authUser.mockResolvedValue({ data: { user: { id: "company-user" } }, error: null });
    mocks.tableResults.set("profiles", { data: { role: "company" }, error: null });
    mocks.tableResults.set("companies", { data: { id: "company-1" }, error: null });
    mocks.tableResults.set("applications", { data: { id: "app-1", student_id: "student-1", position_id: "pos-1" }, error: null });
    mocks.tableResults.set("internship_positions", { data: { id: "pos-1", company_id: "company-1" }, error: null });
    mocks.tableResults.set("students", { data: { cv_path: "students/student-1/cv.pdf" }, error: null });

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ applicationId: "app-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ signedUrl: "https://signed.example/cv.pdf" });
    expect(mocks.createSignedUrl).toHaveBeenCalledWith("students/student-1/cv.pdf", 300);
  });
});
