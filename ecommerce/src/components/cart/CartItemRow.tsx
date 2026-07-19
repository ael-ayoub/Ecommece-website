"use client";

import { formatCurrency } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/types/cart";

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const atMax = item.quantity >= item.stockQuantity;

  return (
    <tr className="border-b border-gray-100">
      <td className="py-3">
        <p className="font-medium">{item.productName}</p>
        <p className="text-xs text-gray-500">{item.variantLabel}</p>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-7 w-7 rounded border border-gray-300"
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            −
          </button>
          <span className="w-6 text-center">{item.quantity}</span>
          <button
            type="button"
            className="h-7 w-7 rounded border border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            disabled={atMax}
            title={atMax ? `Only ${item.stockQuantity} in stock` : undefined}
          >
            +
          </button>
        </div>
        {atMax && (
          <p className="mt-1 text-xs text-gray-500">Max stock reached</p>
        )}
      </td>
      <td>{formatCurrency(item.unitPrice)}</td>
      <td className="font-medium">
        {formatCurrency(item.unitPrice * item.quantity)}
      </td>
      <td>
        <button
          onClick={() => removeItem(item.id)}
          className="text-sm text-red-600 underline"
          aria-label={`Remove ${item.productName}`}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
