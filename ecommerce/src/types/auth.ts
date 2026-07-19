import type { Role } from "@prisma/client";

// What goes into the JWT payload — just enough to identify the user and
// check permissions. Never include passwordHash or other sensitive fields.
export interface JwtPayload {
  sub: string; // user id, as a string (JWT convention)
  role: Role;
  email: string;
}

// The shape returned by getCurrentUser() — safe to pass to client components.
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
}
