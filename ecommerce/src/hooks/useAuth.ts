"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";

// Single source of truth for "who's logged in" on the client. Backed by
// GET /api/auth/me, cached by React Query so every component that calls this
// hook shares one request instead of each firing its own.
export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<{ user: AuthUser | null }>("/api/auth/me"),
  });

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.setQueryData(["auth", "me"], { user: null });
  }

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    isAdmin: data?.user?.role === "ADMIN",
    logout,
  };
}
