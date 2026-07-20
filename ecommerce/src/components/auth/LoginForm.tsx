"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { safeReturnPath } from "@/domain/auth-navigation";
import type { AuthUser } from "@/types/auth";

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--client-border-subtle)] bg-[var(--client-surface)] px-3 text-base outline-none focus:border-[var(--client-text-primary)] focus:ring-2 focus:ring-[var(--client-focus-ring)]/20";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const locked = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
      setError("Enter a valid email address and password.");
      return;
    }
    locked.current = true;
    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      queryClient.setQueryData(["auth", "me"], { user: data.user });
      const fallback = data.user.role === "ADMIN" ? "/admin/products" : "/";
      router.push(safeReturnPath(searchParams.get("redirect"), fallback));
      router.refresh();
    } catch {
      setError("Email or password is incorrect. Please try again.");
    } finally {
      locked.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-6 shadow-[var(--client-shadow-md)] sm:p-8">
      <p className="client-eyebrow">Welcome back</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--client-text-secondary)]">
        Access your profile and order history. Guest checkout remains available.
      </p>
      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <div>
          <label htmlFor="login-email" className="text-sm font-semibold">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="login-password" className="text-sm font-semibold">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pr-12`}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="client-icon-button absolute right-1 top-1/2 mt-1 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="client-button-primary w-full disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <LogIn aria-hidden="true" className="size-4" />
          )}
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--client-text-secondary)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--client-text-primary)] underline underline-offset-4"
        >
          Create one
        </Link>
      </p>
      <Link
        href="/products"
        className="client-text-link mt-3 w-full justify-center text-sm"
      >
        Continue shopping
      </Link>
    </section>
  );
}
