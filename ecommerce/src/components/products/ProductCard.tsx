"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ImageIcon, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { ProductDto } from "@/types/product";
import { getCataloguePresentation } from "@/domain/catalog-presentation";

export function ProductCard({ product }: { product: ProductDto }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const { singleVariant, hasPriceRange, availabilityLabel, action } =
    getCataloguePresentation(product);
  const inStock = action !== "UNAVAILABLE";
  const imageUrl = product.images[0];
  const showImage = Boolean(imageUrl && !imageFailed);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) {
      setImageFailed(true);
    }
  }, [imageUrl]);

  function handleAddToCart() {
    // Only ever reachable when exactly one active in-stock variant exists —
    // otherwise the card shows "Select Options" instead (see below), so a
    // wrong/ambiguous variant can never be silently added from the card.
    if (!singleVariant) return;

    addItem(
      {
        id: `${product.id}:${singleVariant.id}`,
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] ?? null,
        productVariantId: singleVariant.id,
        sku: singleVariant.sku,
        variantLabel: singleVariant.variantLabel,
        unitPrice: Number(
          (singleVariant.price ?? product.basePrice).toString(),
        ),
        stockQuantity: singleVariant.stockQuantity,
      },
      1,
    );
    setAdded(true);
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--client-border-subtle)] bg-[var(--client-surface-elevated)] shadow-[var(--client-shadow-sm)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[var(--client-border-strong)] hover:shadow-[var(--client-shadow-md)] motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${product.name}`}
        className="relative block overflow-hidden bg-[var(--client-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--client-focus-ring)]"
      >
        <div className="flex aspect-[4/5] items-center justify-center text-[var(--client-text-secondary)]">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={imageUrl}
              alt={product.name}
              width={600}
              height={600}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm">
              <ImageIcon aria-hidden="true" className="size-7" />
              <span>Image unavailable</span>
            </div>
          )}
        </div>
        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold shadow-sm ${
              inStock
                ? "bg-white/95 text-[var(--client-success)]"
                : "bg-stone-900/90 text-white"
            }`}
          >
            {inStock ? "Available" : availabilityLabel}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--client-text-secondary)]">
          {product.category.name}
        </p>
        <h3 className="mt-2 text-base font-semibold leading-6 text-[var(--client-text-primary)]">
          <Link
            href={`/products/${product.id}`}
            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--client-focus-ring)] focus-visible:ring-offset-2"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 tabular-nums text-lg font-semibold text-[var(--client-text-primary)]">
          {hasPriceRange ? (
            <>
              {formatCurrency(product.minPrice)}
              <span className="mx-1 text-[var(--client-text-secondary)]">
                –
              </span>
              {formatCurrency(product.maxPrice)}
            </>
          ) : (
            formatCurrency(product.minPrice)
          )}
        </p>

        <div className="mt-auto pt-5">
          {!inStock ? (
            <span
              aria-disabled="true"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--client-surface-muted)] px-4 text-sm font-semibold text-[var(--client-text-secondary)]"
            >
              Currently unavailable
            </span>
          ) : singleVariant ? (
            <button
              onClick={handleAddToCart}
              className="client-button-primary w-full"
            >
              {added ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <ShoppingBag aria-hidden="true" className="size-4" />
              )}
              {added ? "Added to cart" : "Add to cart"}
            </button>
          ) : (
            <Link
              href={`/products/${product.id}`}
              className="client-button-secondary w-full"
            >
              Choose options
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
