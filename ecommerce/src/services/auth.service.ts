import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signJwt } from "@/lib/jwt";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { Role } from "@prisma/client";
import type { RegisterInput, LoginInput } from "@/lib/validators";
import type { AuthUser } from "@/types/auth";

function toAuthUser(user: {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
}): AuthUser {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

export async function registerUser(input: RegisterInput): Promise<{
  user: AuthUser;
  token: string;
}> {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("Email is already registered.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: Role.CLIENT,
    },
  });

  const authUser = toAuthUser(user);
  const token = signJwt({ sub: String(user.id), role: user.role, email: user.email });

  return { user: authUser, token };
}

export async function loginUser(input: LoginInput): Promise<{
  user: AuthUser;
  token: string;
}> {
  const user = await db.user.findUnique({ where: { email: input.email } });

  // Deliberately generic message for both "no such user" and "wrong password"
  // so a login attempt never reveals whether an email is registered.
  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const authUser = toAuthUser(user);
  const token = signJwt({ sub: String(user.id), role: user.role, email: user.email });

  return { user: authUser, token };
}
