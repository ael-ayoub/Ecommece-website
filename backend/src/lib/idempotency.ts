import { redis } from "./redis-client.js";
import { IDEMPOTENCY_TTL_SECONDS } from "../config/constants.js";

const key = (idempotencyKey: string) => `idempotency:order:${idempotencyKey}`;

/** Returns the order id already associated with this key, if any. */
export async function getIdempotentOrderId(idempotencyKey: string): Promise<string | null> {
  return redis.get(key(idempotencyKey));
}

/** Atomically claims the key so concurrent double-submits don't both create an order. Returns false if already claimed. */
export async function claimIdempotencyKey(idempotencyKey: string): Promise<boolean> {
  const result = await redis.set(key(idempotencyKey), "pending", "EX", IDEMPOTENCY_TTL_SECONDS, "NX");
  return result === "OK";
}

export async function resolveIdempotencyKey(idempotencyKey: string, orderId: string): Promise<void> {
  await redis.set(key(idempotencyKey), orderId, "EX", IDEMPOTENCY_TTL_SECONDS);
}

export async function releaseIdempotencyKey(idempotencyKey: string): Promise<void> {
  await redis.del(key(idempotencyKey));
}
