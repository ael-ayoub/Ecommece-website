import { db } from "@/lib/db";

// Fires a Postgres NOTIFY on the order_changes channel — purely observational,
// called only after a transaction has already committed (see call sites in
// order.service.ts). This never participates in the stock decrement/restore
// logic itself; it only announces that something changed, exactly like
// architecture.md §11 describes ("Realtime only has to say 'something
// changed' — React Query's normal fetch/render cycle does the rest").
export async function notifyOrderChanged(orderId: number) {
  const payload = JSON.stringify({ orderId });
  // pg_notify's payload is a plain SQL string argument — parameterized here
  // via Prisma's tagged-template $executeRaw, not string concatenation.
  await db.$executeRaw`SELECT pg_notify('order_changes', ${payload})`;
}
