import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Get the current Supabase access token (client-side only).
 * Use when calling the backend from the browser.
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & { token?: string | null };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { token: providedToken, ...init } = options;
  let token = providedToken;
  if (token === undefined && typeof window !== "undefined") {
    token = await getAccessToken();
  }
  const headers: HeadersInit = {
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (body !== undefined && body !== null && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  // Debug logging to help diagnose connectivity issues
  // eslint-disable-next-line no-console
  console.log("[API] Request", { method, url, hasToken: !!token, body });

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      method,
      headers,
      body:
        body !== undefined && body !== null && method !== "GET"
          ? JSON.stringify(body)
          : undefined,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[API] Network error", err);
    throw new ApiError(
      "Could not connect to the backend server. Make sure the API server is running.",
      0,
      err
    );
  }

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    const message =
      typeof errBody === "object" && errBody !== null && "error" in errBody
        ? String((errBody as { error: unknown }).error)
        : res.statusText || "Request failed";

    // eslint-disable-next-line no-console
    console.error("[API] Error response", { status: res.status, body: errBody });
    throw new ApiError(message, res.status, errBody);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

/**
 * Reusable API client. Uses Supabase access_token when no token is passed.
 * On the server, pass the token from the Supabase session.
 */
export const api = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, options);
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, body, options);
  },
};
