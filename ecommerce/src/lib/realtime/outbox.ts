import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

declare global {
  // eslint-disable-next-line no-var
  var __outboxTimer: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __outboxRunning: boolean | undefined;
}

const BATCH_SIZE = 25;

export async function dispatchOutboxBatch() {
  if (global.__outboxRunning) return;
  global.__outboxRunning = true;
  try {
    const events = await db.outboxEvent.findMany({
      where: { processedAt: null, attempts: { lt: 20 } },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });
    for (const event of events) {
      try {
        const payload = JSON.stringify(event.payload);
        await db.$executeRaw`SELECT pg_notify('order_changes', ${payload})`;
        await db.outboxEvent.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        });
        logger.info("outbox_event_processed", { outboxEventId: event.id });
      } catch (error) {
        await db.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "publish_failed",
          },
        });
        logger.warn("outbox_event_failed", {
          outboxEventId: event.id,
          category: "publish_failed",
        });
      }
    }
  } finally {
    global.__outboxRunning = false;
  }
}

export function ensureOutboxDispatcher() {
  if (global.__outboxTimer) return;
  void dispatchOutboxBatch();
  global.__outboxTimer = setInterval(() => void dispatchOutboxBatch(), 5_000);
  global.__outboxTimer.unref();
}

export function stopOutboxDispatcher() {
  if (global.__outboxTimer) clearInterval(global.__outboxTimer);
  global.__outboxTimer = undefined;
}
