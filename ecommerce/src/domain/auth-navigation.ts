export function safeReturnPath(
  requested: string | null,
  fallback: string,
): string {
  if (
    !requested ||
    !requested.startsWith("/") ||
    requested.startsWith("//") ||
    requested.includes("\\") ||
    requested.includes("\0")
  ) {
    return fallback;
  }
  try {
    const parsed = new URL(requested, "http://local");
    return parsed.origin === "http://local"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

export function validateLoginFields(
  email: string,
  password: string,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export type RegisterFieldErrors = Partial<
  Record<"name" | "email" | "phone" | "password", string>
>;

export function validateRegisterFields(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (!input.name.trim()) errors.name = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (input.phone.trim().length < 6) {
    errors.phone = "Enter a valid phone number.";
  }
  if (input.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  return errors;
}
