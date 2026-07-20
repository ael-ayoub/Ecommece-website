import {
  ORDER_FORWARD_PATH,
  ORDER_STATUS_LABELS,
} from "@/constants/order-status";
import type { OrderStatusValue } from "@/types/order";

// If the order is Cancelled/Returned (terminal, off the forward path), show
// that state plainly instead of a partially-filled forward timeline —
// matches admin-dashboard-spec.md §4's rule that a terminal state replaces
// the forward path rather than sitting alongside it.
export function OrderStatusTimeline({ status }: { status: OrderStatusValue }) {
  if (status === "CANCELLED" || status === "RETURNED") {
    return (
      <p role="status" className="text-sm font-medium text-red-700">
        This order was {ORDER_STATUS_LABELS[status].toLowerCase()}.
      </p>
    );
  }

  const currentIndex = ORDER_FORWARD_PATH.indexOf(status);

  return (
    <ol aria-label="Order progress" className="flex min-w-max items-center">
      {ORDER_FORWARD_PATH.map((step, i) => (
        <li key={step} className="flex items-center">
          <div
            className="flex flex-col items-center"
            aria-current={step === status ? "step" : undefined}
          >
            <span
              aria-hidden="true"
              className={`h-3 w-3 rounded-full border-2 ${
                i <= currentIndex
                  ? "border-gray-900 bg-gray-900"
                  : "border-gray-300 bg-white"
              }`}
            />
            <span className="mt-1 text-xs text-gray-600">
              {ORDER_STATUS_LABELS[step]}
              {step === status ? " (current)" : ""}
            </span>
          </div>
          {i < ORDER_FORWARD_PATH.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-8 ${i < currentIndex ? "bg-gray-900" : "bg-gray-300"}`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
