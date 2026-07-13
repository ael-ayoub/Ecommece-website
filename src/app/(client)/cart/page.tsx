"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { formatCurrency } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, hydrated } = useCart();

  // Avoid flashing the empty state before localStorage has been read.
  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-gray-600">Your cart is empty. Start shopping!</p>
        <Link href="/products" className="text-sm font-medium underline">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Cart</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex flex-col items-end gap-1 text-sm">
        <p className="flex w-56 justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </p>
        <p className="flex w-56 justify-between">
          <span className="text-gray-500">Shipping</span>
          <span>$0.00</span>
        </p>
        <p className="flex w-56 justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(subtotal)}</span>
        </p>
      </div>

      <div className="mt-8 flex justify-between">
        <Link href="/products" className="text-sm underline">
          ← Continue Shopping
        </Link>
        <button
          type="button"
          disabled
          title="Checkout arrives in a later phase"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
