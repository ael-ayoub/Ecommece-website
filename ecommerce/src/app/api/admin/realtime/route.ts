import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/guards/require-admin";
import { ensureOrderListener, orderEvents } from "@/lib/realtime/listener";
import { handleApiError } from "@/lib/errors";

// Requires a persistent Node connection (the LISTEN client in
// src/lib/realtime/listener.ts) — must run on the Node runtime, and must
// never be statically optimized (it's a long-lived stream, not a
// cacheable response).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 20_000;

// Server-Sent Events endpoint — one open connection per connected admin
// browser tab. Broadcasts "something changed" only (an orderId), never the
// full order payload; the client re-fetches via the existing React Query
// hooks already built in Phase 5/6 (architecture.md §11's documented
// pattern). No notification/toast content is ever sent — this stream is
// pure UI-refresh signaling.
export async function GET(req: NextRequest) {
  // Unlike every other route, this one can't just be wrapped in one
  // top-level try/catch (the rest of the function returns a streaming
  // Response, not a plain JSON one) — so the auth check is deliberately
  // isolated here and reported through the same handleApiError() every
  // other route uses, instead of being allowed to propagate as an
  // unhandled exception (which Next.js turns into an opaque 500 rather
  // than the intended 401/403).
  try {
    await requireAdmin();
  } catch (err) {
    return handleApiError(err);
  }

  ensureOrderListener();

  const encoder = new TextEncoder();

  let heartbeat: NodeJS.Timeout;
  let onOrderChanged: (payload: { orderId: number }) => void;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));

      // Lets the client mark itself "connected" the instant the stream
      // opens, rather than waiting for the first real order event.
      send(`event: connected\ndata: {}\n\n`);

      onOrderChanged = (payload) => {
        send(`event: order-changed\ndata: ${JSON.stringify(payload)}\n\n`);
      };
      orderEvents.on("order-changed", onOrderChanged);

      // SSE comment lines (":...") keep the connection alive through
      // proxies/load balancers without ever reaching the client's onmessage
      // handler — purely a keep-alive, not app data.
      heartbeat = setInterval(() => send(`: heartbeat\n\n`), HEARTBEAT_MS);
    },
    cancel() {
      clearInterval(heartbeat);
      orderEvents.off("order-changed", onOrderChanged);
    },
  });

  // Abort cleanup for the case where the client disconnects without the
  // stream's own cancel() firing promptly (e.g. network drop).
  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    orderEvents.off("order-changed", onOrderChanged);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
