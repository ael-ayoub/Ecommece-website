"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import { apiFetch } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address";
    if (phone.trim().length < 6) next.phone = "Enter a valid phone number";
    if (password.length < 8)
      next.password = "Password must be at least 8 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
      });
      queryClient.setQueryData(["auth", "me"], { user: data.user });
      router.push(data.user.role === "ADMIN" ? "/admin/products" : "/");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Create account</h1>

      {formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <FieldError message={errors.name} />
      </div>

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
        <label className="mb-1 block text-sm font-medium">Phone *</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <FieldError message={errors.phone} />
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
        {submitting ? "Creating account…" : "Register"}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="underline">
          Log in
        </a>
      </p>
    </form>
  );
}
