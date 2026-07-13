"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import { OrderItemsTable } from "@/components/orders/OrderItemsTable";
import type { OrderDto } from "@/types/order";

interface FieldErrors {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shippingAddress?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { items, subtotal, hydrated, clearCart } = useCart();

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderDto | null>(null);

  // Pre-fill from the logged-in account once auth resolves — still editable.
  useEffect(() => {
    if (user) {
      setContactName((v) => v || user.name);
      setContactEmail((v) => v || user.email);
      setContactPhone((v) => v || user.phone);
    }
  }, [user]);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!contactName.trim()) next.contactName = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) next.contactEmail = "Enter a valid email address";
    if (contactPhone.trim().length < 6) next.contactPhone = "Enter a valid phone number";
    if (!shippingAddress.trim()) next.shippingAddress = "Delivery address is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { order } = await apiFetch<{ order: OrderDto }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          contactName,
          contactEmail,
          contactPhone,
          shippingAddress,
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      });

      clearCart();

      if (isAuthenticated) {
        router.push(`/orders/${order.id}?justPlaced=1`);
      } else {
        setPlacedOrder(order);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Order failed to place. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) return null;

  // Guest confirmation view — shown inline since there's no route a guest
  // could revisit afterward (GET /api/orders/:id is logged-in only).
  if (placedOrder) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-2xl font-bold">✓ Order placed successfully!</h1>
        <p className="mb-6 text-sm text-gray-600">
          Order #{placedOrder.id} — {new Date(placedOrder.createdAt).toLocaleString()}
        </p>

        <OrderItemsTable items={placedOrder.items} total={placedOrder.totalAmount} />

        <p className="mt-4 text-sm text-gray-600">
          Delivery Address: {placedOrder.shippingAddress}
        </p>

        <div className="mt-6 rounded-md bg-gray-50 p-4 text-sm">
          <p>The seller will call you to confirm the order.</p>
          <p>No order tracking is available for guest checkouts.</p>
        </div>

        <Link href="/products" className="mt-6 inline-block text-sm font-medium underline">
          Continue Shopping
        </Link>
      </div>
    );
  }

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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Delivery Information</h1>

        {formError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Full Name *</label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          <FieldError message={errors.contactName} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Email *</label>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
          <FieldError message={errors.contactEmail} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Phone *</label>
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
          <FieldError message={errors.contactPhone} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Delivery Address *</label>
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            required
          />
          <FieldError message={errors.shippingAddress} />
        </div>

        <p className="text-sm font-medium">Payment: Cash on Delivery</p>
        <p className="text-xs text-gray-500">You only pay when you receive your order.</p>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Placing order…" : "Place Order"}
        </Button>
      </form>

      <div className="h-fit rounded-lg border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold">Order Review</h2>
        <ul className="mb-3 flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.productName} ({item.variantLabel}) × {item.quantity}
              </span>
              <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
