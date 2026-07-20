"use client";

import Link from "next/link";
import { ImageIcon, Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/types/cart";
import { ProductImage } from "@/components/products/ProductImage";

export function CartItemCard({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const atMaximum = item.quantity >= item.stockQuantity;

  return (
    <article className="grid gap-4 rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] p-4 shadow-[var(--client-shadow-sm)] sm:grid-cols-[7.5rem_1fr_auto] sm:p-5">
      <Link
        href={`/products/${item.productId}`}
        aria-label={`View ${item.productName}`}
        className="aspect-square overflow-hidden rounded-xl bg-[var(--client-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)]"
      >
        {item.productImage ? (
          <ProductImage
            src={item.productImage}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-xs text-[var(--client-text-secondary)]">
            <ImageIcon aria-hidden="true" className="size-6" />
            No image
          </span>
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href={`/products/${item.productId}`}
          className="rounded-sm text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)]"
        >
          {item.productName}
        </Link>
        <p className="mt-1 text-sm text-[var(--client-text-secondary)]">
          {item.variantLabel}
        </p>
        <p className="mt-1 text-xs text-[var(--client-text-secondary)]">
          SKU {item.sku}
        </p>
        <p className="mt-3 text-sm">
          <span className="text-[var(--client-text-secondary)]">
            Unit price{" "}
          </span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(item.unitPrice)}
          </span>
        </p>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Quantity</p>
          <div className="inline-flex items-center rounded-xl border border-[var(--client-border-subtle)]">
            <button
              type="button"
              aria-label={`Decrease ${item.productName} quantity`}
              disabled={item.quantity <= 1}
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="client-icon-button rounded-r-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <output
              aria-live="polite"
              aria-label={`${item.productName} quantity`}
              className="grid h-11 min-w-12 place-items-center border-x border-[var(--client-border-subtle)] font-semibold tabular-nums"
            >
              {item.quantity}
            </output>
            <button
              type="button"
              aria-label={`Increase ${item.productName} quantity`}
              disabled={atMaximum}
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="client-icon-button rounded-l-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
          {atMaximum && (
            <p className="mt-2 text-xs text-[var(--client-text-secondary)]">
              Maximum available quantity reached.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 border-t border-[var(--client-border-subtle)] pt-4 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--client-text-secondary)]">
            Item subtotal
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatCurrency(item.unitPrice * item.quantity)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--client-danger)] transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-danger)] motion-reduce:transition-none"
          aria-label={`Remove ${item.productName} from cart`}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Remove
        </button>
      </div>
    </article>
  );
}
