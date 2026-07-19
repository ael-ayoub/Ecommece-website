"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type RealtimeStatus = "connecting" | "connected" | "reconnecting";

// Admin-only live order updates (architecture.md §11). Opens one
// EventSource per mounted admin session, and on every "something changed"
// signal, invalidates the existing React Query caches Phase 5/6 already
// built — this hook never carries order data itself, it only ever says
// "go refetch." No toast/sound/popup is ever rendered here; the only
// effect is the underlying list/detail/dashboard queries silently
// refetching and re-rendering.
export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const everConnected = useRef(false);

  useEffect(() => {
    const source = new EventSource("/api/admin/realtime");

    function invalidateAll() {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    }

    source.addEventListener("connected", () => {
      setStatus("connected");
      if (everConnected.current) {
        // Reconnected after a drop — the stream may have missed events
        // while it was down, so resync fully rather than trust the cache.
        invalidateAll();
      }
      everConnected.current = true;
    });

    source.addEventListener("order-changed", (event: MessageEvent) => {
      let orderId: number | undefined;
      try {
        orderId = JSON.parse(event.data).orderId;
      } catch {
        // ignore malformed payloads
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
      if (orderId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "order", String(orderId)],
        });
      }
    });

    source.onerror = () => {
      // The browser's EventSource retries automatically; this only drives
      // the visible status indicator. A subsequent "connected" event (fired
      // when the retry succeeds) flips status back and triggers the resync.
      setStatus("reconnecting");
    };

    return () => {
      source.close();
    };
  }, [queryClient]);

  return { status };
}
