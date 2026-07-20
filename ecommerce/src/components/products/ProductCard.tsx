"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ImageIcon, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { ProductDto } from "@/types/product";

export function ProductCard({ product }: { product: ProductDto }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const activeVariants = product.variants.filter(
    (v) => v.isActive && v.stockQuantity > 0,
  );
  const singleVariant =
    product.productType === "SIMPLE" && activeVariants.length === 1
      ? activeVariants[0]
      : null;
  const inStock = product.availability === "AVAILABLE";
  const imageUrl = product.images[0];
  const showImage = Boolean(imageUrl && !imageFailed);
  const hasPriceRange = product.minPrice !== product.maxPrice;
  const availabilityLabel =
    product.availability === "OUT_OF_STOCK" ? "Out of stock" : "Unavailable";

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
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-900/5 motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${product.name}`}
        className="relative block overflow-hidden bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900"
      >
        <div className="flex aspect-square items-center justify-center text-stone-500">
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
                ? "bg-white/95 text-stone-800"
                : "bg-stone-900/90 text-white"
            }`}
          >
            {inStock ? "Available" : availabilityLabel}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          {product.category.name}
        </p>
        <h3 className="mt-2 text-base font-semibold leading-6 text-stone-950">
          <Link
            href={`/products/${product.id}`}
            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 tabular-nums text-lg font-semibold text-stone-950">
          {hasPriceRange ? (
            <>
              {formatCurrency(product.minPrice)}
              <span className="mx-1 text-stone-400">–</span>
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
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-stone-100 px-4 text-sm font-semibold text-stone-500"
            >
              Currently unavailable
            </span>
          ) : singleVariant ? (
            <button
              onClick={handleAddToCart}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
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
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-semibold text-stone-900 transition-colors hover:border-stone-500 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
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
