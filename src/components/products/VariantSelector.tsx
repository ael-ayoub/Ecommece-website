"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ProductVariantDto } from "@/types/product";

export function VariantSelector({
  variants,
  basePrice,
}: {
  variants: ProductVariantDto[];
  basePrice: string;
}) {
  const selectableVariants = variants; // disabled/out-of-stock stay visible but non-selectable
  const firstSelectable = variants.find((v) => v.isActive && v.stockQuantity > 0);
  const [selectedId, setSelectedId] = useState<number | null>(firstSelectable?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const selected = useMemo(
    () => selectableVariants.find((v) => v.id === selectedId) ?? null,
    [selectableVariants, selectedId],
  );

  const price = selected?.price ?? basePrice;
  const maxQty = selected?.stockQuantity ?? 0;

  function selectVariant(v: ProductVariantDto) {
    if (!v.isActive || v.stockQuantity === 0) return;
    setSelectedId(v.id);
    setQuantity(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium">Variant</p>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const disabled = !v.isActive || v.stockQuantity === 0;
            const active = v.id === selectedId;
            return (
              <button
                key={v.id}
                type="button"
                disabled={disabled}
                onClick={() => selectVariant(v)}
                title={
                  !v.isActive ? "Unavailable" : v.stockQuantity === 0 ? "Out of stock" : undefined
                }
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  disabled
                    ? "cursor-not-allowed border-gray-200 text-gray-300 line-through"
                    : active
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 hover:border-gray-500"
                }`}
              >
                {v.variantLabel}
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="mt-2 text-sm text-gray-600">
            {selected.variantLabel} — {selected.stockQuantity} left
          </p>
        )}
      </div>

      <p className="text-2xl font-bold">{formatCurrency(price)}</p>

      {selected ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Quantity:</span>
            <button
              type="button"
              className="h-8 w-8 rounded border border-gray-300"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              className="h-8 w-8 rounded border border-gray-300"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Add to Cart
          </button>
        </>
      ) : (
        <p className="text-sm font-medium text-red-600">Out of stock</p>
      )}
    </div>
  );
}
