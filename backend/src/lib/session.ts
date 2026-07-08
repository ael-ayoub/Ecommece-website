import { randomUUID } from "node:crypto";
import { redis } from "./redis-client.js";
import { env } from "../config/env.js";

const SESSION_TTL_SECONDS = env.SESSION_TTL_DAYS * 24 * 60 * 60;

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const userSessionsKey = (userId: string) => `user_sessions:${userId}`;

export interface SessionData {
  userId: string;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  await redis.set(sessionKey(sessionId), JSON.stringify({ userId } satisfies SessionData), "EX", SESSION_TTL_SECONDS);
  await redis.sadd(userSessionsKey(userId), sessionId);
  await redis.expire(userSessionsKey(userId), SESSION_TTL_SECONDS);
  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as SessionData;
}

export async function destroySession(sessionId: string, userId?: string): Promise<void> {
  await redis.del(sessionKey(sessionId));
  if (userId) await redis.srem(userSessionsKey(userId), sessionId);
}

/** Called on password change — invalidates every active session for this user. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  const sessionIds = await redis.smembers(userSessionsKey(userId));
  if (sessionIds.length > 0) {
    await redis.del(...sessionIds.map(sessionKey));
  }
  await redis.del(userSessionsKey(userId));
}
