// Thin fetch wrapper for client components: same-origin, JSON in/out,
// throws with the server's error message so callers can show it directly.
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? "Something went wrong. Please try again.");
  }

  return data as T;
}
