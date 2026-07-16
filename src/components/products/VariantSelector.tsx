"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { ProductVariantDto } from "@/types/product";

interface Props {
  productId: number;
  productName: string;
  productImage: string | null;
  variants: ProductVariantDto[];
  basePrice: string;
  productType: "SIMPLE" | "CONFIGURABLE";
}

export function VariantSelector({
  productId,
  productName,
  productImage,
  variants,
  basePrice,
  productType,
}: Props) {
  const { addItem } = useCart();
  const selectableVariants = variants; // disabled/out-of-stock stay visible but non-selectable
  const firstSelectable = variants.find((v) => v.isActive && v.stockQuantity > 0);
  const [selectedId, setSelectedId] = useState<number | null>(firstSelectable?.id ?? null);
  const structured = variants.some((variant) => (variant.optionValues?.length ?? 0) > 0);
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (firstSelectable?.optionValues ?? []).map(({ optionValue }) => [
        optionValue.option.name,
        optionValue.value,
      ]),
    ),
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const selected = useMemo(
    () => selectableVariants.find((v) => v.id === selectedId) ?? null,
    [selectableVariants, selectedId],
  );

  const price = selected?.price ?? basePrice;
  const maxQty = selected?.stockQuantity ?? 0;
  const optionDefinitions = useMemo(() => {
    const values = new Map<string, Set<string>>();
    for (const variant of variants) {
      for (const link of variant.optionValues ?? []) {
        const name = link.optionValue.option.name;
        const current = values.get(name) ?? new Set<string>();
        current.add(link.optionValue.value);
        values.set(name, current);
      }
    }
    return Array.from(values.entries()).map(([name, optionValues]) => ({
      name,
      values: Array.from(optionValues),
    }));
  }, [variants]);

  function selectOption(name: string, value: string) {
    const next = { ...selections, [name]: value };
    setSelections(next);
    const match = variants.find(
      (variant) =>
        variant.isActive &&
        variant.stockQuantity > 0 &&
        (variant.optionValues ?? []).every(
          ({ optionValue }) => next[optionValue.option.name] === optionValue.value,
        ),
    );
    setSelectedId(match?.id ?? null);
    setQuantity(1);
    setJustAdded(false);
  }

  function selectVariant(v: ProductVariantDto) {
    if (!v.isActive || v.stockQuantity === 0) return;
    setSelectedId(v.id);
    setQuantity(1);
    setJustAdded(false);
  }

  function handleAddToCart() {
    // Defensive guard mirroring selectVariant's rule — a disabled/out-of-stock
    // variant can never be `selected` in the first place, but this keeps the
    // add path itself provably safe even if that invariant ever changes.
    if (!selected || !selected.isActive || selected.stockQuantity === 0) return;

    addItem(
      {
        id: `${productId}:${selected.id}`,
        productId,
        productName,
        productImage,
        productVariantId: selected.id,
        sku: selected.sku,
        variantLabel: selected.variantLabel,
        unitPrice: Number((selected.price ?? basePrice).toString()),
        stockQuantity: selected.stockQuantity,
      },
      quantity,
    );
    setJustAdded(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {productType === "CONFIGURABLE" && structured && (
        <div className="space-y-3">
          {optionDefinitions.map((option) => (
            <div key={option.name}>
              <p className="mb-1 text-sm font-medium">{option.name}</p>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const possible = variants.some(
                    (variant) =>
                      variant.isActive &&
                      variant.stockQuantity > 0 &&
                      (variant.optionValues ?? []).some(
                        ({ optionValue }) =>
                          optionValue.option.name === option.name && optionValue.value === value,
                      ),
                  );
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={!possible}
                      onClick={() => selectOption(option.name, value)}
                      className={`rounded border px-3 py-1 text-sm ${
                        selections[option.name] === value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {productType === "CONFIGURABLE" && !structured && (
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
      )}

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
              className="h-8 w-8 rounded border border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={quantity >= maxQty}
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {justAdded ? "Added ✓" : "Add to Cart"}
          </button>
        </>
      ) : (
        <p className="text-sm font-medium text-red-600">Out of stock</p>
      )}
    </div>
  );
}
