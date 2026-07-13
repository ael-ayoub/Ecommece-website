import Link from "next/link";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency } from "@/lib/format";
import type { OrderDto } from "@/types/order";

export function RecentOrders({ orders }: { orders: OrderDto[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-gray-500">No orders yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Order</th>
          <th>Client</th>
          <th>Status</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="border-b border-gray-100">
            <td className="py-2">#{order.id}</td>
            <td>{order.userId ? order.contactName : "Guest"}</td>
            <td>
              <StatusBadge status={order.status} />
            </td>
            <td>{formatCurrency(order.totalAmount)}</td>
            <td className="text-right">
              <Link href={`/admin/orders/${order.id}`} className="underline">
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
