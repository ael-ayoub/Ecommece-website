import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

/**
 * Single shared Prisma client for the whole process. Repositories import this
 * directly rather than receiving it via constructor injection — keeps the
 * repository layer simple while still being the only layer that touches Prisma.
 */
export const prisma = new PrismaClient({ adapter });
