import { apiRequest } from "./client";

export type AdminRole = "SUPER_ADMIN" | "STAFF";

export interface AdminSession {
  id: string;
  email: string;
  role: AdminRole;
}

export function login(email: string, password: string) {
  return apiRequest<{ message: string }>("/admin/auth/login", { method: "POST", body: { email, password } });
}

export function verifyOtp(email: string, code: string) {
  return apiRequest<{ admin: AdminSession }>("/admin/auth/verify-otp", { method: "POST", body: { email, code } });
}

export function me() {
  return apiRequest<{ admin: AdminSession }>("/admin/auth/me");
}

export function logout() {
  return apiRequest<{ message: string }>("/admin/auth/logout", { method: "POST" });
}

export function forgotPassword(email: string) {
  return apiRequest<{ message: string }>("/admin/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return apiRequest<{ message: string }>("/admin/auth/reset-password", {
    method: "POST",
    body: { email, code, newPassword },
  });
}
