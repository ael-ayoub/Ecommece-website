"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { ProductVariantDto } from "@/types/product";
import { optionValueAvailability } from "@/domain/option-template";

interface Props {
  productId: number;
  productName: string;
  productImage: string | null;
  variants: ProductVariantDto[];
  basePrice: string;
  productType: "SIMPLE" | "CONFIGURABLE";
  showExactStock: boolean;
}

export function VariantSelector({
  productId,
  productName,
  productImage,
  variants,
  basePrice,
  productType,
  showExactStock,
}: Props) {
  const { addItem } = useCart();
  const firstPurchasable = variants.find(
    (variant) => variant.isActive && variant.stockQuantity > 0,
  );
  const structured = variants.some(
    (variant) => (variant.optionValues?.length ?? 0) > 0,
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    productType === "SIMPLE" ? (firstPurchasable?.id ?? null) : null,
  );
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const addLocked = useRef(false);

  const selected = useMemo(
    () => variants.find((variant) => variant.id === selectedId) ?? null,
    [variants, selectedId],
  );

  const optionDefinitions = useMemo(() => {
    const options = new Map<
      string,
      { position: number; values: Set<string> }
    >();
    for (const variant of variants) {
      for (const link of variant.optionValues ?? []) {
        const option = link.optionValue.option;
        const current = options.get(option.name) ?? {
          position: option.position,
          values: new Set<string>(),
        };
        current.values.add(link.optionValue.value);
        options.set(option.name, current);
      }
    }
    return Array.from(options.entries())
      .map(([name, option]) => ({
        name,
        position: option.position,
        values: Array.from(option.values),
      }))
      .sort((a, b) => a.position - b.position);
  }, [variants]);

  const availabilityVariants = useMemo(
    () =>
      variants.map((variant) => ({
        isActive: variant.isActive,
        stockQuantity: variant.stockQuantity,
        values: Object.fromEntries(
          (variant.optionValues ?? []).map(({ optionValue }) => [
            optionValue.option.name,
            optionValue.value,
          ]),
        ),
      })),
    [variants],
  );

  const effectivePrice = selected?.price ?? basePrice;
  const maxQuantity = selected?.stockQuantity ?? 0;
  const allOptionsSelected =
    optionDefinitions.length > 0 &&
    optionDefinitions.every((option) => selections[option.name]);

  function selectOption(name: string, value: string) {
    const next = { ...selections, [name]: value };
    setSelections(next);
    const match = variants.find(
      (variant) =>
        variant.isActive &&
        variant.stockQuantity > 0 &&
        (variant.optionValues?.length ?? 0) === optionDefinitions.length &&
        (variant.optionValues ?? []).every(
          ({ optionValue }) =>
            next[optionValue.option.name] === optionValue.value,
        ),
    );
    setSelectedId(match?.id ?? null);
    setQuantity(1);
    setJustAdded(false);
  }

  function selectVariant(variant: ProductVariantDto) {
    if (!variant.isActive || variant.stockQuantity === 0) return;
    setSelectedId(variant.id);
    setQuantity(1);
    setJustAdded(false);
  }

  function changeQuantity(value: number) {
    setQuantity(Math.max(1, Math.min(maxQuantity, Math.trunc(value) || 1)));
    setJustAdded(false);
  }

  function handleAddToCart() {
    if (
      addLocked.current ||
      !selected ||
      !selected.isActive ||
      selected.stockQuantity === 0
    ) {
      return;
    }
    addLocked.current = true;
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
    window.requestAnimationFrame(() => {
      addLocked.current = false;
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="tabular-nums text-3xl font-bold tracking-tight">
          {formatCurrency(effectivePrice)}
        </p>
        <span
          className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${
            selected
              ? "bg-green-50 text-[var(--client-success)]"
              : "bg-[var(--client-surface-muted)] text-[var(--client-text-secondary)]"
          }`}
          aria-live="polite"
        >
          {selected
            ? showExactStock
              ? `${selected.stockQuantity} available`
              : "Available"
            : firstPurchasable
              ? "Choose your options"
              : "Out of stock"}
        </span>
      </div>

      {productType === "CONFIGURABLE" && structured && (
        <div className="mt-7 space-y-6">
          {optionDefinitions.map((option) => (
            <fieldset key={option.name}>
              <legend className="text-sm font-semibold">
                {option.name}
                {selections[option.name] && (
                  <span className="ml-2 font-normal text-[var(--client-text-secondary)]">
                    {selections[option.name]}
                  </span>
                )}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const availability = optionValueAvailability(
                    availabilityVariants,
                    selections,
                    option.name,
                    value,
                  );
                  const available = availability === "AVAILABLE";
                  const active = selections[option.name] === value;
                  const stateLabel =
                    availability === "OUT_OF_STOCK"
                      ? "out of stock"
                      : "unavailable";
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={!available}
                      aria-pressed={active}
                      aria-label={`${option.name}: ${value}${available ? "" : `, ${stateLabel}`}`}
                      onClick={() => selectOption(option.name, value)}
                      className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2 motion-reduce:transition-none ${
                        active
                          ? "border-[var(--client-text-primary)] bg-[var(--client-text-primary)] text-white"
                          : available
                            ? "border-[var(--client-border-subtle)] bg-[var(--client-surface)] hover:border-[var(--client-border-strong)]"
                            : "cursor-not-allowed border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] text-[var(--client-text-secondary)] line-through opacity-60"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {productType === "CONFIGURABLE" && !structured && (
        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">Choose a Variant</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const disabled = !variant.isActive || variant.stockQuantity === 0;
              const active = variant.id === selectedId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => selectVariant(variant)}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2 ${
                    disabled
                      ? "cursor-not-allowed border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] text-[var(--client-text-secondary)] line-through opacity-60"
                      : active
                        ? "border-[var(--client-text-primary)] bg-[var(--client-text-primary)] text-white"
                        : "border-[var(--client-border-subtle)] hover:border-[var(--client-border-strong)]"
                  }`}
                >
                  {variant.variantLabel}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {selected && (
        <div className="mt-6 rounded-xl bg-[var(--client-surface-muted)] p-4 text-sm">
          <p className="font-semibold">{selected.variantLabel}</p>
          <p className="mt-1 text-xs text-[var(--client-text-secondary)]">
            SKU {selected.sku}
          </p>
        </div>
      )}

      {selected ? (
        <>
          <div className="mt-6">
            <label htmlFor="product-quantity" className="text-sm font-semibold">
              Quantity
            </label>
            <div className="mt-2 inline-flex items-center rounded-xl border border-[var(--client-border-subtle)] bg-[var(--client-surface)]">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => changeQuantity(quantity - 1)}
                className="client-icon-button rounded-r-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <input
                id="product-quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(event) => changeQuantity(Number(event.target.value))}
                className="h-11 w-14 border-x border-[var(--client-border-subtle)] bg-transparent text-center text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--client-focus-ring)]"
              />
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= maxQuantity}
                onClick={() => changeQuantity(quantity + 1)}
                className="client-icon-button rounded-l-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--client-text-secondary)]">
              Maximum {maxQuantity} for this SKU.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="client-button-primary mt-6 w-full"
          >
            {justAdded ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <ShoppingBag aria-hidden="true" className="size-4" />
            )}
            {justAdded ? "Added to Cart" : "Add to Cart"}
          </button>
          <p
            className="mt-3 min-h-5 text-center text-sm text-[var(--client-success)]"
            aria-live="polite"
          >
            {justAdded ? `${quantity} added. Your cart has been updated.` : ""}
          </p>
        </>
      ) : (
        <div
          role="status"
          className="mt-6 rounded-xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-muted)] p-4 text-sm font-medium text-[var(--client-text-secondary)]"
        >
          {firstPurchasable
            ? allOptionsSelected
              ? "This combination is not offered or is out of stock."
              : "Select one value for every option to continue."
            : "This Product is currently out of stock."}
        </div>
      )}
    </div>
  );
}
