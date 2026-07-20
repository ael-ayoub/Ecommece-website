"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";
import {
  safeReturnPath,
  validateRegisterFields,
  type RegisterFieldErrors,
} from "@/domain/auth-navigation";

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-[var(--client-border-subtle)] bg-[var(--client-surface)] px-3 text-base outline-none focus:border-[var(--client-text-primary)] focus:ring-2 focus:ring-[var(--client-focus-ring)]/20";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const locked = useRef(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    setError(null);
    const nextErrors = validateRegisterFields(form);
    setFieldErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      document.getElementById(`register-${firstError}`)?.focus();
      return;
    }
    locked.current = true;
    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      queryClient.setQueryData(["auth", "me"], { user: data.user });
      const fallback = data.user.role === "ADMIN" ? "/admin/products" : "/";
      router.push(safeReturnPath(searchParams.get("redirect"), fallback));
      router.refresh();
    } catch {
      setError(
        "We could not create your account. Check your details or try logging in.",
      );
    } finally {
      locked.current = false;
      setSubmitting(false);
    }
  }

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <section className="rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-6 shadow-[var(--client-shadow-md)] sm:p-8">
      <p className="client-eyebrow">Your account</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Create account</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--client-text-secondary)]">
        Save your contact details and securely access orders placed while signed
        in.
      </p>
      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <Field
          id="register-name"
          label="Full name"
          value={form.name}
          onChange={set("name")}
          autoComplete="name"
          error={fieldErrors.name}
        />
        <Field
          id="register-email"
          label="Email"
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
          type="email"
          error={fieldErrors.email}
        />
        <Field
          id="register-phone"
          label="Phone"
          value={form.phone}
          onChange={set("phone")}
          autoComplete="tel"
          type="tel"
          error={fieldErrors.phone}
        />
        <div>
          <label htmlFor="register-password" className="text-sm font-semibold">
            Password
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => set("password")(event.target.value)}
              className={`${inputClass} pr-12`}
              required
              minLength={8}
              aria-describedby="register-password-hint"
              aria-invalid={!!fieldErrors.password}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
              className="client-icon-button absolute right-1 top-1/2 mt-1 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
          <p
            id="register-password-hint"
            className="mt-2 text-xs text-[var(--client-text-secondary)]"
          >
            {fieldErrors.password ?? "Use at least 8 characters."}
          </p>
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
            <UserPlus aria-hidden="true" className="size-4" />
          )}
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--client-text-secondary)]">
        Already have an account?{" "}
        <Link
          href={`/login${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(safeReturnPath(searchParams.get("redirect"), "/"))}` : ""}`}
          className="font-semibold text-[var(--client-text-primary)] underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
      <Link href="/products" className="client-text-link mt-3 w-full justify-center text-sm">
        Continue shopping
      </Link>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
        required
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
