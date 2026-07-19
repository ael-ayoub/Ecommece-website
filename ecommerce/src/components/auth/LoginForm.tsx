"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import { apiFetch } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      queryClient.setQueryData(["auth", "me"], { user: data.user });

      const redirect = searchParams.get("redirect");
      const destination =
        redirect ?? (data.user.role === "ADMIN" ? "/admin/products" : "/");
      router.push(destination);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Log in</h1>

      {formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Email *</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FieldError message={errors.email} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Password *</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FieldError message={errors.password} />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Logging in…" : "Log in"}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <a href="/register" className="underline">
          Register here
        </a>
      </p>
    </form>
  );
}
