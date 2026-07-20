"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Check,
  LoaderCircle,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { StorefrontState } from "@/components/storefront/StorefrontState";
import type { OrderDto } from "@/types/order";
import {
  checkoutErrorMessage,
  validateCheckoutDetails,
  type CheckoutFieldErrors,
} from "@/domain/shopping-journey";

const fieldClass =
  "mt-2 block min-h-12 w-full rounded-xl border border-[var(--client-border-subtle)] bg-[var(--client-surface)] px-3 py-2 text-base outline-none transition placeholder:text-stone-400 focus:border-[var(--client-text-primary)] focus:ring-2 focus:ring-[var(--client-focus-ring)]/20";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, subtotal, hydrated, clearCart } = useCart();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderDto | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const submissionLocked = useRef(false);
  const fieldRefs = {
    contactName: useRef<HTMLInputElement>(null),
    contactEmail: useRef<HTMLInputElement>(null),
    contactPhone: useRef<HTMLInputElement>(null),
    shippingAddress: useRef<HTMLTextAreaElement>(null),
  };

  useEffect(() => {
    if (!user) return;
    setContactName((value) => value || user.name);
    setContactEmail((value) => value || user.email);
    setContactPhone((value) => value || user.phone);
  }, [user]);

  const details = {
    contactName,
    contactEmail,
    contactPhone,
    shippingAddress,
  };

  function validate() {
    const next = validateCheckoutDetails(details);
    setErrors(next);
    const fieldOrder: (keyof CheckoutFieldErrors)[] = [
      "contactName",
      "contactEmail",
      "contactPhone",
      "shippingAddress",
    ];
    const firstInvalid = fieldOrder.find((field) => next[field]);
    if (firstInvalid) fieldRefs[firstInvalid].current?.focus();
    return !firstInvalid;
  }

  function validateField(field: keyof CheckoutFieldErrors) {
    const nextMessage = validateCheckoutDetails(details)[field];
    setErrors((current) => ({ ...current, [field]: nextMessage }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLocked.current) return;
    setFormError(null);
    if (!validate()) return;

    submissionLocked.current = true;
    setSubmitting(true);
    try {
      idempotencyKey.current ??= crypto.randomUUID();
      const { order } = await apiFetch<{ order: OrderDto }>("/api/orders", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({
          ...details,
          items: items.map((item) => ({
            variantId: item.productVariantId,
            quantity: item.quantity,
          })),
        }),
      });
      clearCart();
      idempotencyKey.current = null;
      if (isAuthenticated) {
        router.push(`/orders/${order.id}?justPlaced=1`);
      } else {
        setPlacedOrder(order);
      }
    } catch (error) {
      setFormError(checkoutErrorMessage(error));
    } finally {
      submissionLocked.current = false;
      setSubmitting(false);
    }
  }

  if (!hydrated || authLoading) {
    return (
      <main
        aria-busy="true"
        aria-label="Loading checkout"
        className="animate-pulse pb-12 motion-reduce:animate-none"
      >
        <div className="h-10 w-56 rounded bg-stone-200" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_23rem]">
          <div className="h-[34rem] rounded-2xl bg-stone-100" />
          <div className="h-80 rounded-2xl bg-stone-100" />
        </div>
      </main>
    );
  }

  if (placedOrder) {
    return (
      <main className="mx-auto max-w-2xl pb-12 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-green-50 text-[var(--client-success)]">
          <Check aria-hidden="true" className="size-8" />
        </span>
        <p className="client-eyebrow mt-6">Order confirmed</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Your order has been placed
        </h1>
        <p className="mt-3 text-[var(--client-text-secondary)]">
          Order{" "}
          <strong className="text-[var(--client-text-primary)]">
            #{placedOrder.id}
          </strong>
        </p>

        <section
          aria-labelledby="confirmation-summary"
          className="mt-8 rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 text-left shadow-[var(--client-shadow-md)]"
        >
          <h2 id="confirmation-summary" className="text-lg font-semibold">
            Confirmed summary
          </h2>
          <ul className="mt-4 space-y-3">
            {placedOrder.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span>
                  {item.productNameSnapshot}
                  <span className="block text-xs text-[var(--client-text-secondary)]">
                    {item.variant?.variantLabelSnapshot} ×{" "}
                    {item.variant?.quantity ?? 0}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(
                    Number(item.variant?.unitPriceSnapshot?.toString() ?? 0) *
                      (item.variant?.quantity ?? 0),
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-[var(--client-border-subtle)] pt-4 font-bold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(placedOrder.totalAmount)}
            </span>
          </div>
          <p className="mt-5 text-sm text-[var(--client-text-secondary)]">
            Delivery address: {placedOrder.shippingAddress}
          </p>
        </section>

        <div className="mt-5 rounded-2xl bg-[var(--client-accent-soft)] p-5 text-left text-sm leading-6">
          <p className="font-semibold">Cash on Delivery</p>
          <p className="mt-1">
            The seller may contact you to confirm this order.
          </p>
          <p>Guest order tracking is not available through an account.</p>
        </div>

        <Link href="/products" className="client-button-primary mt-7">
          Continue shopping
        </Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main>
        <StorefrontState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add an available Product before entering checkout."
          actionHref="/products"
          actionLabel="Browse Products"
        />
      </main>
    );
  }

  return (
    <main className="pb-12">
      <header className="max-w-2xl">
        <p className="client-eyebrow">Secure order review</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Checkout
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--client-text-secondary)]">
          {isAuthenticated
            ? "Your account details are pre-filled and remain editable for this order."
            : "Guest checkout is fully supported. No account is required."}
        </p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <form onSubmit={handleSubmit} noValidate>
          <section
            aria-labelledby="delivery-heading"
            className="rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 shadow-[var(--client-shadow-sm)] sm:p-7"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--client-text-primary)] text-sm font-bold text-white">
                1
              </span>
              <div>
                <h2 id="delivery-heading" className="text-xl font-semibold">
                  Delivery information
                </h2>
                <p className="mt-1 text-sm text-[var(--client-text-secondary)]">
                  Used only to process and deliver this order.
                </p>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
              >
                <p className="font-semibold">Order not placed</p>
                <p>{formError}</p>
              </div>
            )}

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <CheckoutField
                id="contactName"
                label="Full name"
                value={contactName}
                error={errors.contactName}
                inputRef={fieldRefs.contactName}
                autoComplete="name"
                onChange={setContactName}
                onBlur={() => validateField("contactName")}
              />
              <CheckoutField
                id="contactEmail"
                label="Email"
                type="email"
                value={contactEmail}
                error={errors.contactEmail}
                inputRef={fieldRefs.contactEmail}
                autoComplete="email"
                onChange={setContactEmail}
                onBlur={() => validateField("contactEmail")}
              />
              <CheckoutField
                id="contactPhone"
                label="Phone"
                type="tel"
                value={contactPhone}
                error={errors.contactPhone}
                inputRef={fieldRefs.contactPhone}
                autoComplete="tel"
                onChange={setContactPhone}
                onBlur={() => validateField("contactPhone")}
              />
              <div className="sm:col-span-2">
                <label
                  htmlFor="shippingAddress"
                  className="text-sm font-semibold"
                >
                  Delivery address{" "}
                  <span
                    aria-hidden="true"
                    className="text-[var(--client-danger)]"
                  >
                    *
                  </span>
                </label>
                <textarea
                  ref={fieldRefs.shippingAddress}
                  id="shippingAddress"
                  rows={4}
                  value={shippingAddress}
                  autoComplete="street-address"
                  aria-invalid={Boolean(errors.shippingAddress)}
                  aria-describedby={
                    errors.shippingAddress
                      ? "shippingAddress-error"
                      : "shippingAddress-help"
                  }
                  onChange={(event) => setShippingAddress(event.target.value)}
                  onBlur={() => validateField("shippingAddress")}
                  className={fieldClass}
                />
                <p
                  id="shippingAddress-help"
                  className="mt-2 text-xs text-[var(--client-text-secondary)]"
                >
                  Enter the complete address where this order should be
                  delivered.
                </p>
                {errors.shippingAddress && (
                  <p
                    id="shippingAddress-error"
                    role="alert"
                    className="mt-2 text-sm text-[var(--client-danger)]"
                  >
                    {errors.shippingAddress}
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="mt-6 rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--client-text-primary)] text-sm font-bold text-white">
                2
              </span>
              <div>
                <h2 className="text-xl font-semibold">Place your order</h2>
                <p className="mt-1 text-sm text-[var(--client-text-secondary)]">
                  The server validates current SKU price and stock before
                  confirming.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-[var(--client-accent-soft)] p-4 text-sm">
              <Banknote
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[var(--client-accent)]"
              />
              <div>
                <p className="font-semibold">Cash on Delivery</p>
                <p className="mt-1 text-[var(--client-text-secondary)]">
                  Payment is collected when you receive the order.
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="client-button-primary mt-6 w-full disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <PackageCheck aria-hidden="true" className="size-4" />
              )}
              {submitting ? "Confirming order…" : "Place Order"}
            </button>
            <p
              className="mt-3 text-center text-xs text-[var(--client-text-secondary)]"
              aria-live="polite"
            >
              {submitting ? "Please wait. Do not refresh or submit again." : ""}
            </p>
          </div>
        </form>

        <aside
          aria-labelledby="review-heading"
          className="rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-5 shadow-[var(--client-shadow-md)] lg:sticky lg:top-24"
        >
          <h2 id="review-heading" className="text-xl font-semibold">
            Order review
          </h2>
          <ul className="mt-5 space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{item.productName}</span>
                  <span className="block text-xs leading-5 text-[var(--client-text-secondary)]">
                    {item.variantLabel} · Qty {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-between border-t border-[var(--client-border-subtle)] pt-4">
            <span className="font-bold">Cart total</span>
            <span className="font-bold tabular-nums">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--client-text-secondary)]">
            Cart prices are reviewed here for convenience. The confirmed order
            total comes from the server.
          </p>
          <Link href="/cart" className="client-text-link mt-3 font-semibold">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Edit cart
          </Link>
        </aside>
      </div>
    </main>
  );
}

function CheckoutField({
  id,
  label,
  type = "text",
  value,
  error,
  autoComplete,
  inputRef,
  onChange,
  onBlur,
}: {
  id: "contactName" | "contactEmail" | "contactPhone";
  label: string;
  type?: "text" | "email" | "tel";
  value: string;
  error?: string;
  autoComplete: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className={id === "contactName" ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}{" "}
        <span aria-hidden="true" className="text-[var(--client-danger)]">
          *
        </span>
      </label>
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={fieldClass}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-sm text-[var(--client-danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
