const API_BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Thrown when the access token is expired AND the silent refresh also failed — the caller should redirect to login. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

// Lets AuthContext (or anything else) react when a request ends up SessionExpired,
// without api/client.ts needing to know about React context.
let sessionExpiredHandler: (() => void) | null = null;
export function onSessionExpired(handler: () => void): void {
  sessionExpiredHandler = handler;
}

// Concurrent 401s share a single in-flight refresh call instead of each firing their own.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/admin/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function rawRequest(path: string, options: RequestOptions): Promise<Response> {
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Core request helper for every admin API call. On a 401 (expired access token), attempts one
 * silent refresh and retries the request once. If the refresh also fails, throws
 * SessionExpiredError so the caller (see auth/AuthContext.tsx) can redirect to /admin/login.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawRequest(path, options);

  if (response.status === 401 && path !== "/admin/auth/refresh" && path !== "/admin/auth/login") {
    const refreshed = await refreshSession();
    if (!refreshed) {
      sessionExpiredHandler?.();
      throw new SessionExpiredError();
    }
    response = await rawRequest(path, options);
    if (response.status === 401) {
      sessionExpiredHandler?.();
      throw new SessionExpiredError();
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
