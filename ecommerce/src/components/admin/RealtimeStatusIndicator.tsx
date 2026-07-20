"use client";

import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";

const STATUS_TEXT: Record<string, string> = {
  connecting: "Connecting…",
  connected: "Live",
  reconnecting: "Reconnecting…",
};

const STATUS_DOT: Record<string, string> = {
  connecting: "bg-gray-400",
  connected: "bg-green-500",
  reconnecting: "bg-yellow-500 animate-pulse",
};

// Mounted once in src/app/admin/layout.tsx — this is what actually opens
// the EventSource (via useRealtimeOrders) for the whole admin section, and
// is the only visible trace of the real-time layer: a small dot + label,
// no toast/sound/popup, per the locked "silent update" scope.
export function RealtimeStatusIndicator() {
  const { status } = useRealtimeOrders();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 text-xs text-gray-500"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`}
      />
      <span>{STATUS_TEXT[status]}</span>
    </div>
  );
}
